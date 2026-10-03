export const MOVE_PAD_DEAD_ZONE=.10;
export function movePadVector(rect,clientX,clientY){
 const radius=rect.width*.36,dx=clientX-(rect.left+rect.width/2),dy=clientY-(rect.top+rect.height/2),distance=Math.hypot(dx,dy);
 if(!(radius>0)||![dx,dy,distance].every(Number.isFinite))return{x:0,z:0,thumbX:0,thumbY:0};
 const length=Math.min(radius,distance),thumbX=distance?dx/distance*length:0,thumbY=distance?dy/distance*length:0,magnitude=length/radius;
 if(magnitude<=MOVE_PAD_DEAD_ZONE)return{x:0,z:0,thumbX,thumbY};
 const speed=(magnitude-MOVE_PAD_DEAD_ZONE)/(1-MOVE_PAD_DEAD_ZONE);
 return{x:dx/distance*speed,z:dy/distance*speed,thumbX,thumbY};
}
export function constructionMovePadTemplate(){return `<div class="construction-move-pad" data-construction-pad role="group" aria-label="スライド式移動パッド"><span class="construction-move-stick" data-move-stick aria-hidden="true"></span></div><p class="construction-keyboard-hint">W：前　A：左<br>S：後ろ　D：右</p>`;}
// Touch identifiers own the Safari gesture; a second finger can look around.
// Pointer capture is used only for mouse/pen. Release listeners run in capture.
export function createConstructionMovePad({element,input,enabled,onChange=()=>{},windowTarget=globalThis.window,documentTarget=globalThis.document}){
 const thumb=element.querySelector('[data-move-stick]'),listeners=[];let gesture=null,disposed=false;
 const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push(()=>target?.removeEventListener(type,fn,options));};
 const render=(x=0,y=0)=>{thumb.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;element.classList.toggle('is-moving',!!(x||y));};
 function end(){const g=gesture;if(!g)return;gesture=null;input.release(g.source);render();if(g.kind==='pointer'&&element.hasPointerCapture?.(g.id))element.releasePointerCapture(g.id);onChange();}
 function cancel(){end();}
 function update(point){const g=gesture;if(!g)return;if(!enabled()||documentTarget?.hidden||!input.hasStick(g.source)){cancel();return;}const v=movePadVector(element.getBoundingClientRect(),point.clientX,point.clientY);if(!input.setStick(g.source,v.x,v.z)){cancel();return;}render(v.thumbX,v.thumbY);onChange();}
 function begin(point,kind,id){if(disposed||gesture||!enabled()||documentTarget?.hidden)return false;const source=(kind==='touch'?'touch:':'pointer:')+id;if(!input.beginStick(source))return false;gesture={kind,id,source};update(point);return true;}
 listen(element,'touchstart',e=>{const point=Array.from(e.changedTouches??[])[0];if(point&&begin(point,'touch',point.identifier))e.preventDefault();},{passive:false});
 listen(windowTarget,'touchmove',e=>{if(gesture?.kind!=='touch')return;const point=Array.from(e.changedTouches??[]).find(t=>t.identifier===gesture.id);if(point){update(point);e.preventDefault();}},{capture:true,passive:false});
 const touchEnd=e=>{if(gesture?.kind!=='touch')return;const point=Array.from(e.changedTouches??[]).find(t=>t.identifier===gesture.id);if(point)end(point,e.type==='touchcancel');else if(e.touches&&!Array.from(e.touches).some(t=>t.identifier===gesture.id))cancel();};
 for(const type of['touchend','touchcancel'])listen(windowTarget,type,touchEnd,{capture:true,passive:true});
 listen(element,'pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0||!begin(e,'pointer',e.pointerId))return;e.preventDefault();try{element.setPointerCapture(e.pointerId);}catch{cancel();}});
 listen(windowTarget,'pointermove',e=>{if(gesture?.kind!=='pointer'||gesture.id!==e.pointerId)return;if(e.pointerType==='mouse'&&(e.buttons&1)===0){cancel();return;}update(e);e.preventDefault();},{capture:true,passive:false});
 const pointerEnd=e=>{if(gesture?.kind==='pointer'&&gesture.id===e.pointerId)end(e,e.type!=='pointerup');};for(const type of['pointerup','pointercancel','lostpointercapture'])listen(windowTarget,type,pointerEnd,true);
 for(const type of['blur','pagehide','resize'])listen(windowTarget,type,cancel);
 listen(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)cancel();});
 for(const type of['contextmenu','selectstart','dragstart'])listen(element,type,e=>e.preventDefault());
 function sync(){const allowed=!disposed&&enabled();element.setAttribute('aria-disabled',String(!allowed));if(!allowed||gesture&&!input.hasStick(gesture.source))cancel();}
 render();return{sync,cancel,dispose(){cancel();disposed=true;for(const remove of listeners)remove();}};
}
