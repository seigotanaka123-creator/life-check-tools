export function holdDashButtonTemplate(){return '<button type="button" class="hold-dash-button" data-hud data-hold-dash aria-label="ダッシュ（押している間）" aria-pressed="false"><span aria-hidden="true">≫</span><b data-dash-label>ダッシュ</b></button>';}

// A second finger owns speed only. Releasing it never releases the movement pad.
export function createHeldDashButton({element,enabled,context=()=> 'foot',windowTarget=globalThis.window,documentTarget=globalThis.document}){
 if(!element)return {get active(){return false;},sync(){},cancel(){},dispose(){}};
 const owners=new Map(),listeners=[];let mode=null,disposed=false;
 const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push(()=>target?.removeEventListener(type,fn,options));};
 const render=()=>element.setAttribute('aria-pressed',String(owners.size>0));
 function release(source){const owner=owners.get(source);owners.delete(source);if(owner?.kind==='pointer'&&element.hasPointerCapture?.(owner.id))element.releasePointerCapture(owner.id);render();}
 function cancel(){for(const source of [...owners.keys()])release(source);}
 function sync(){const next=context(),allowed=!disposed&&!documentTarget?.hidden&&enabled();if(!allowed||next!==mode)cancel();mode=next;element.disabled=!allowed;return allowed;}
 function start(kind,id){if(!sync())return false;const key=kind+':'+id;if(owners.has(key))return false;owners.set(key,{kind,id});render();return true;}
 function reconcile(e){if(!e.touches)return;const live=new Set(Array.from(e.touches,t=>'touch:'+t.identifier));for(const key of [...owners.keys()])if(key.startsWith('touch:')&&!live.has(key))release(key);}
 listen(element,'touchstart',e=>{reconcile(e);let accepted=false;for(const t of Array.from(e.changedTouches??[]))accepted=start('touch',t.identifier)||accepted;if(accepted){e.preventDefault();e.stopPropagation?.();}},{passive:false});
 listen(windowTarget,'touchmove',e=>{reconcile(e);if(Array.from(e.changedTouches??[]).some(t=>owners.has('touch:'+t.identifier)))e.preventDefault();},{capture:true,passive:false});
 listen(windowTarget,'touchstart',reconcile,{capture:true,passive:true});
 const touchEnd=e=>{for(const t of Array.from(e.changedTouches??[]))release('touch:'+t.identifier);reconcile(e);};
 for(const type of ['touchend','touchcancel'])listen(windowTarget,type,touchEnd,{capture:true,passive:true});
 listen(element,'pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0||!start('pointer',e.pointerId))return;e.preventDefault();e.stopPropagation?.();try{element.setPointerCapture(e.pointerId);}catch{release('pointer:'+e.pointerId);}});
 const pointerEnd=e=>release('pointer:'+e.pointerId);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(windowTarget,type,pointerEnd,true);
 listen(windowTarget,'pointermove',e=>{if(owners.has('pointer:'+e.pointerId)&&e.pointerType==='mouse'&&(e.buttons&1)===0)release('pointer:'+e.pointerId);},true);
 listen(element,'keydown',e=>{if(!['Space','Enter'].includes(e.code)||e.repeat)return;e.preventDefault();e.stopPropagation?.();start('key',e.code);});
 listen(windowTarget,'keyup',e=>release('key:'+e.code),true);
 for(const type of ['blur','pagehide','resize'])listen(windowTarget,type,cancel);
 listen(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)cancel();});
 for(const type of ['contextmenu','selectstart','dragstart'])listen(element,type,e=>e.preventDefault());
 render();return {get active(){return sync()&&owners.size>0;},sync,cancel,dispose(){cancel();disposed=true;for(const remove of listeners)remove();element.disabled=true;}};
}
