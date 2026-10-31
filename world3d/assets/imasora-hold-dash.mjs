
// A nearby action borrows a complete Space press before movement sees it.
// Capture must be installed before actions that open dialogs or input shields.
export function bindContextSpaceAction({buttons,enabled,clearInput=()=>{},windowTarget=globalThis.window,documentTarget=globalThis.document}){
 let held=false,disposed=false;
 const space=e=>e.imasoraConfirm===true||(e.imasoraConfirm===undefined&&(e.code==='Space'||e.key===' ')),consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const usable=b=>b&&!b.hidden&&!b.disabled&&b.isConnected!==false&&!b.closest?.('[hidden],[inert]')&&!b.matches?.(':disabled,[aria-disabled="true"]')&&b.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})!==false&&(b.getClientRects?.().length??1)>0;
 function down(e){
  if(disposed||!space(e)||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
  if(held){consume(e);return;}
  if(e.repeat||documentTarget?.hidden||e.target?.isContentEditable||e.target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]')||!enabled())return;
  const focused=e.target?.closest?.('button,[role="button"]'),list=buttons().filter(usable),button=list.find(b=>b===focused)??list[0];
  // In live play the nearby action wins, even if a previous HUD click
  // left keyboard focus on Menu or Camera. Open menus are gated by enabled.
  if(!button)return;
  held=true;consume(e);clearInput();button.click();
 }
 function up(e){if(space(e)&&held){held=false;consume(e);}}
 const cancel=()=>{held=false;},hidden=()=>{if(documentTarget?.hidden)cancel();};
 windowTarget.addEventListener('keydown',down,true);windowTarget.addEventListener('keyup',up,true);
 for(const type of['blur','pagehide'])windowTarget.addEventListener(type,cancel);
 documentTarget?.addEventListener('visibilitychange',hidden);
 return{get held(){return held;},dispose(){if(disposed)return;disposed=true;cancel();windowTarget.removeEventListener('keydown',down,true);windowTarget.removeEventListener('keyup',up,true);for(const type of['blur','pagehide'])windowTarget.removeEventListener(type,cancel);documentTarget?.removeEventListener('visibilitychange',hidden);}};
}

export function holdDashButtonTemplate(){return '<button type="button" class="hold-dash-button" data-hud data-hold-dash aria-label="ダッシュ（押している間）" aria-pressed="false"><span aria-hidden="true">≫</span><b data-dash-label>ダッシュ</b></button>';}

// Optional thumb roll: latch dash on B, enter/leave A to press/release jump.
// Each physical finger stays one owner; other held tools do not opt into this.
export function createHeldDashButton({element,enabled,context=()=> 'foot',jump=null,windowTarget=globalThis.window,documentTarget=globalThis.document}){
 if(!element)return {get active(){return false;},sync(){},cancel(){},dispose(){}};
 const owners=new Map(),rolls=new Map(),listeners=[];let mode=null,disposed=false;
 const peer=jump?.element&&jump?.control?.press&&jump?.control?.release?jump:null;
 const listen=(target,type,fn,options)=>{target?.addEventListener?.(type,fn,options);listeners.push(()=>target?.removeEventListener?.(type,fn,options));};
 let renderedPressed=null;const render=()=>{const value=String(owners.size>0);if(value!==renderedPressed){element.setAttribute('aria-pressed',value);renderedPressed=value;}};
 function release(source){const owner=owners.get(source),roll=rolls.get(source);owners.delete(source);rolls.delete(source);if(roll)peer.control.release('thumb:'+source);const target=roll?.capture??element,id=owner?.id??roll?.id;if((owner?.kind??roll?.kind)==='pointer'&&target.hasPointerCapture?.(id))target.releasePointerCapture(id);render();}
 function cancel(){for(const source of new Set([...owners.keys(),...rolls.keys()]))release(source);}
 function sync(){const next=context(),allowed=!disposed&&!documentTarget?.hidden&&enabled();if(!allowed||next!==mode)cancel();mode=next;if(element.disabled!==!allowed)element.disabled=!allowed;return allowed;}
 function start(kind,id){if(!sync())return false;const key=kind+':'+id;if(owners.has(key))return false;owners.set(key,{kind,id});render();return true;}
 function bounds(el){if(el.hidden||el.checkVisibility?.()===false)return null;const r=el.getBoundingClientRect?.();return r?.width>0&&r?.height>0?r:null;}
 function inside(p,r,margin=0){if(!r||!Number.isFinite(p.clientX)||!Number.isFinite(p.clientY))return false;return ((p.clientX-r.left-r.width/2)/(r.width/2+margin))**2+((p.clientY-r.top-r.height/2)/(r.height/2+margin))**2<=1;}
 function rollMove(source,p){const r=rolls.get(source);if(!r)return;if(!sync()||rolls.get(source)!==r)return;
  if(!owners.has(source)&&inside(p,r.dash,4))start(r.kind,r.id);
  const over=inside(p,r.jump,r.over?10:4);if(over===r.over)return;r.over=over;
  if(over)peer.control.press('thumb:'+source);else peer.control.release('thumb:'+source);
 }
 function beginRoll(kind,id,p,capture){if(!peer||!sync())return false;const source=kind+':'+id;if(rolls.has(source))return true;const rect=bounds(peer.element);if(!rect)return false;rolls.set(source,{kind,id,capture,jump:rect,dash:bounds(element),over:false});rollMove(source,p);return true;}
 function reconcile(e){if(!e.touches)return;const live=new Set(Array.from(e.touches,t=>'touch:'+t.identifier));for(const key of new Set([...owners.keys(),...rolls.keys()]))if(key.startsWith('touch:')&&!live.has(key))release(key);}
 listen(element,'touchstart',e=>{reconcile(e);let accepted=false;for(const t of Array.from(e.changedTouches??[])){if(start('touch',t.identifier)){beginRoll('touch',t.identifier,t,element);accepted=true;}}if(accepted){e.preventDefault();e.stopPropagation?.();}},{passive:false});
 if(peer)listen(peer.element,'touchstart',e=>{reconcile(e);let accepted=false;for(const t of Array.from(e.changedTouches??[]))accepted=beginRoll('touch',t.identifier,t,peer.element)||accepted;if(accepted){e.preventDefault();e.stopImmediatePropagation?.();}},{capture:true,passive:false});
 listen(windowTarget,'touchmove',e=>{reconcile(e);let owned=false;for(const t of Array.from(e.changedTouches??[])){const key='touch:'+t.identifier;if(owners.has(key)||rolls.has(key)){owned=true;rollMove(key,t);}}if(owned)e.preventDefault();},{capture:true,passive:false});
 listen(windowTarget,'touchstart',reconcile,{capture:true,passive:true});
 const touchEnd=e=>{for(const t of Array.from(e.changedTouches??[]))release('touch:'+t.identifier);reconcile(e);};
 for(const type of ['touchend','touchcancel'])listen(windowTarget,type,touchEnd,{capture:true,passive:true});
 listen(element,'pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0||!start('pointer',e.pointerId))return;e.preventDefault();e.stopPropagation?.();beginRoll('pointer',e.pointerId,e,element);try{element.setPointerCapture(e.pointerId);}catch{release('pointer:'+e.pointerId);}});
 if(peer)listen(peer.element,'pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0||!beginRoll('pointer',e.pointerId,e,peer.element))return;e.preventDefault();e.stopImmediatePropagation?.();try{peer.element.setPointerCapture(e.pointerId);}catch{release('pointer:'+e.pointerId);}},{capture:true});
 const pointerEnd=e=>release('pointer:'+e.pointerId);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(windowTarget,type,pointerEnd,true);
 listen(windowTarget,'pointermove',e=>{const key='pointer:'+e.pointerId;if(!owners.has(key)&&!rolls.has(key))return;if(e.pointerType==='mouse'&&(e.buttons&1)===0)release(key);else rollMove(key,e);},true);
 listen(element,'keydown',e=>{if(!['Space','Enter'].includes(e.code)||e.repeat)return;e.preventDefault();e.stopPropagation?.();start('key',e.code);});
 listen(windowTarget,'keyup',e=>release('key:'+e.code),true);
 for(const type of ['blur','pagehide','resize'])listen(windowTarget,type,cancel);
 listen(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)cancel();});
 for(const type of ['contextmenu','selectstart','dragstart'])listen(element,type,e=>e.preventDefault());
 render();return {get active(){return sync()&&owners.size>0;},sync,cancel,dispose(){cancel();disposed=true;for(const remove of listeners)remove();element.disabled=true;}};
}
