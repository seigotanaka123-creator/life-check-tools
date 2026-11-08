// One held jump gesture can have several physical owners. Releasing one key
// or finger must not cut a jump which another owner is still holding.
const activeActions=['forward','back','left','right','jump','dash','tool','menu'];
function shortcutAvailable(bindings,code){return !activeActions.some(key=>bindings[key]?.includes(code));}
export const HUNT_DIVE_KEY='KeyH';
export function huntDiveShortcutAvailable(bindings){return shortcutAvailable(bindings,HUNT_DIVE_KEY);}
export function huntItemShortcutAvailable(bindings){return shortcutAvailable(bindings,'KeyL');}
export function huntItemKeyCodes(bindings){return[...new Set([...(huntItemShortcutAvailable(bindings)?['KeyL']:[]),...(bindings.tool??[]).filter(Boolean)])];}
export function createHuntJumpOwners(intent){const owners=new Set();return{set(source,down){const before=owners.size>0;if(down)owners.add(source);else owners.delete(source);const after=owners.size>0;if(!before&&after)intent.press();if(before&&!after)intent.release();},reset(){owners.clear();intent.reset();},get held(){return owners.size>0;}};}

// Each finger owns its buttons independently. Lifting/cancelling one finger
// must not release another finger's dash, jump, item, or the movement pad.
export const HUNT_DASH_MODE_KEY='imasora-tag-touch-dash-v1';
const dashMode=value=>value==='toggle'?'toggle':'hold';
export function readHuntDashMode(storage){try{const saved=JSON.parse(storage?.getItem(HUNT_DASH_MODE_KEY)??'null');return saved?.version===1?dashMode(saved.mode):'hold';}catch{return'hold';}}
export function saveHuntDashMode(storage,mode){if(!['hold','toggle'].includes(mode))return false;try{const value=JSON.stringify({version:1,mode});storage?.setItem(HUNT_DASH_MODE_KEY,value);return storage?.getItem(HUNT_DASH_MODE_KEY)===value;}catch{return false;}}
export function createHuntButtonOwners(jumpOwners,{dashMode:initialMode='hold',onDashChange=()=>{}}={}){const presses=new Map(),held=new Set(),dashSeen=new Set();let mode=dashMode(initialMode),latched=false,reported='';
 const sync=()=>{held.clear();for(const actions of presses.values())for(const action of actions)if(action!=='dash'||mode==='hold')held.add(action);if(latched)held.add('dash');jumpOwners.set('thumb',held.has('jump'));const next=mode+':'+latched+':'+held.has('dash');if(next!==reported){reported=next;onDashChange({mode,latched,active:held.has('dash')});}};
 const reset=()=>{presses.clear();dashSeen.clear();latched=false;sync();};
 sync();return{presses,held,set(id,actions){const next=new Set(actions);if(mode==='toggle'&&next.has('dash')&&!dashSeen.has(id)){// A gesture toggles once, including sliding from jump to dash. A second finger over a held dash is not another tap.
 if(![...presses].some(([other,buttons])=>other!==id&&buttons.has('dash')))latched=!latched;dashSeen.add(id);}presses.set(id,next);sync();},release(id){presses.delete(id);dashSeen.delete(id);sync();},cancel(id){if(presses.has(id)&&(dashSeen.has(id)||presses.get(id).has('dash'))&&![...presses].some(([other,buttons])=>other!==id&&buttons.has('dash')))latched=false;presses.delete(id);dashSeen.delete(id);sync();},clear:reset,setMode(next){if(!['hold','toggle'].includes(next))throw Error('INVALID_DASH_MODE');mode=next;reset();},stats:()=>({mode,latched,active:held.has('dash'),owners:presses.size})};
}

// State is cleared by the caller before capture loss can dispatch more events.
export function releaseHuntPointerCaptures(entries){for(const [target,id]of entries){if(id==null)continue;try{if(target?.hasPointerCapture?.(id))target.releasePointerCapture(id);}catch{}}}

// A cached page is suspended, not destroyed. Keep its verification worker and
// audio service available for the next explicit resume gesture.
export function bindHuntLifecycle({windowTarget,documentTarget,pause,worker,audio,onRestore=()=>{}}){let closed=false;const listeners=[],listen=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));},suspend=()=>{if(!closed)pause();};
 listen(windowTarget,'blur',suspend);listen(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)suspend();});
 listen(windowTarget,'pagehide',e=>{if(closed)return;pause();if(!e.persisted){closed=true;worker.terminate();audio.dispose();}});
 listen(windowTarget,'pageshow',e=>{if(!closed&&e.persisted){pause();onRestore();}});
 return()=>{closed=true;for(const remove of listeners)remove();};
}

// Menu keys are one-shot; modal dialogs retain native text and close handling.
export function huntMenuCommand({repeat=false,dialogOpen=false,hasResult=false,configVisible=false,resultVisible=false,paused=true}={}){if(dialogOpen)return'native';if(repeat)return'ignore';if(hasResult)return configVisible||!resultVisible?'show-result':'hide-result';return paused?'none':'pause';}

// Claim a pointer only after the browser accepts its capture.
export function captureHuntPointer(target, event) {
  if (event.button !== 0) return false;
  try {
    target.setPointerCapture(event.pointerId);
    return true;
  } catch {
    return false;
  }
}

export function bindHuntTouchGuard(documentTarget, isPlaying) {
  const gameControl = '#rink,#pad,#pair';
  const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])';
  function guard(event) {
    const target = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
    if (!target?.closest || target.closest(editable)) return;
    const onControl = target.closest(gameControl);
    if (event.type === 'touchstart' ? isPlaying() && onControl : isPlaying() || onControl) {
      event.preventDefault();
    }
  }
  for (const type of ['selectstart','contextmenu','dragstart','touchstart']) {
    documentTarget.addEventListener(type, guard, {capture:true, passive:false});
  }
}

// Discrete actions retain a completed tap until the next simulation step.
export function createHuntActionInput(target, canPress, onButtonActivate = () => {}) {
  const held = new Set();
  const pending = new Set();
  const accepted = Symbol('completed button activation');
  const shortcut = Symbol('field shortcut');
  target.addEventListener('pointerdown', event => {
    if (!canPress() || held.has(event.pointerId) || !captureHuntPointer(target, event)) return;
    event.preventDefault();
    held.add(event.pointerId);
    pending.add(event.pointerId);
  });
  target.addEventListener('pointerup', ({pointerId}) => {
    if (held.delete(pointerId) && pending.delete(pointerId)) pending.add(accepted);
  });
  // Native keyboard and assistive activations have no pointer-down event.
  // Pointer clicks are already handled above, including short taps.
  target.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  target.addEventListener('click', event => {
    if (event.detail !== 0 || target.disabled || !canPress()) return;
    pending.add(accepted);
    onButtonActivate();
  });
  function cancel({pointerId}) {
    if (held.delete(pointerId)) pending.delete(pointerId);
  }
  target.addEventListener('pointercancel', cancel);
  target.addEventListener('lostpointercapture', cancel);
  return {
    press() { pending.add(shortcut); },
    releaseKeyboard() { pending.delete(shortcut); },
    read() {
      const active = pending.size > 0;
      pending.clear();
      return active;
    },
    clear() {
      const captures = [...held].map(id => [target, id]);
      held.clear();
      pending.clear();
      releaseHuntPointerCaptures(captures);
    },
  };
}

export function huntKeyboardContext(event,{canvas,playing,capturing,dialogOpen}){
 if(capturing||dialogOpen||event.ctrlKey||event.altKey||event.metaKey||event.defaultPrevented)return null;
 const target=event.target;
 if(target?.isContentEditable||target?.closest?.('input,textarea,select,[role="textbox"]'))return null;
 const field=playing&&target===canvas;
 const ime=event.isComposing||event.keyCode===229||event.key==='Process';
 // In the field, mapped actions are physical keys even during IME processing.
 // Consume text defaults here, leaving actual input fields and dialogs alone.
 if(field&&(ime||event.key?.length===1))event.preventDefault();
 return ime&&!field?null:{field};
}
