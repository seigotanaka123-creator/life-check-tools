// Only device input and interruption cleanup are shared. No race state or physics.
export function bindRaceActions({root,bindings,paused,pause,canvas,events=window,doc=document}){
 const keys=new Set(),touches=new Map(),listeners=[];let axis={x:0,z:0},padId=null;const pad=root.querySelector('[data-pad]'),nub=pad?.querySelector('i');
 const on=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
 function clear(){keys.clear();axis={x:0,z:0};const previousPad=padId;padId=null;if(previousPad!==null&&pad?.hasPointerCapture?.(previousPad))try{pad.releasePointerCapture(previousPad);}catch{}if(nub)nub.style.transform='translate(0px,0px)';for(const [el,p]of touches){touches.delete(el);try{if(el.hasPointerCapture?.(p.id))el.releasePointerCapture(p.id);}catch{}}}
 const editable=el=>el?.matches?.('input,textarea,select,[contenteditable=true]');
 on(events,'keydown',e=>{if(editable(e.target))return;if(e.code==='Escape'){e.preventDefault();pause();return;}if(bindings[e.code]){e.preventDefault();if(!paused())keys.add(e.code);}},{capture:true});
 on(events,'keyup',e=>{if(bindings[e.code]){keys.delete(e.code);if(!editable(e.target))e.preventDefault();}},{capture:true});
 for(const button of root.querySelectorAll('[data-action]')){
  on(button,'pointerdown',e=>{if(paused()||touches.has(button))return;e.preventDefault();touches.set(button,{id:e.pointerId,action:button.dataset.action});try{button.setPointerCapture(e.pointerId);}catch{touches.delete(button);}canvas.focus({preventScroll:true});});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(button,type,e=>{if(touches.get(button)?.id===e.pointerId){touches.delete(button);try{button.releasePointerCapture(e.pointerId);}catch{}}});
 }
 if(pad){const update=e=>{const b=pad.getBoundingClientRect(),r=b.width*.34,x=(e.clientX-b.left-b.width/2)/r,z=(e.clientY-b.top-b.height/2)/r,n=Math.max(1,Math.hypot(x,z));axis={x:x/n,z:z/n};if(Math.hypot(axis.x,axis.z)<.12)axis={x:0,z:0};if(nub)nub.style.transform=`translate(${axis.x*r}px,${axis.z*r}px)`;};
  on(pad,'pointerdown',e=>{if(paused()||padId!==null)return;e.preventDefault();padId=e.pointerId;try{pad.setPointerCapture(padId);}catch{padId=null;return;}update(e);canvas.focus({preventScroll:true});});on(pad,'pointermove',e=>{if(e.pointerId===padId){e.preventDefault();update(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(pad,type,e=>{if(e.pointerId===padId){padId=null;axis={x:0,z:0};if(nub)nub.style.transform='translate(0px,0px)';}});
 }
 function interrupt(){clear();try{if(padId!==null)pad?.releasePointerCapture(padId);}catch{}pause();}
 for(const type of ['blur','pagehide','pageshow','orientationchange'])on(events,type,interrupt);on(doc,'visibilitychange',()=>{if(doc.hidden)interrupt();});
 for(const type of ['contextmenu','selectstart','dragstart'])on(root,type,e=>e.preventDefault());
 return{has(action){return[...keys].some(k=>bindings[k]===action)||[...touches.values()].some(p=>p.action===action);},vector(){return{...axis};},clear,dispose(){clear();for(const remove of listeners)remove();}};
}
