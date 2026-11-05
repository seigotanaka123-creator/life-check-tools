import{createTouchLayoutStore,resolveTouchLayout,TOUCH_LAYOUT_KEY}from'./imasora-touch-layout.mjs';
const clamp=(v,min,max)=>Math.min(Math.max(v,min),Math.max(min,max));
export function resolveHuntTouchLayout(width,height,saved=null,safe={}){
 const layout=resolveTouchLayout(width,height,saved,safe);
 const {top=0,bottom=0,left=0,right=0}=safe;
 const maxPairY=height-bottom-65;
 // Above the pair, the tallest button begins 146 px before its centre.
 // Use the side row when it would enter the header's 60 px band.
 const sideTools=layout.orientation==='landscape'&&maxPairY<top+206&&width-left-right>=400;
 const maxPairX=width-right-63;
 const minPairX=sideTools?Math.min(maxPairX,Math.max(width/2+74,left+271)):width/2+74;
 layout.pair.x=clamp(layout.pair.x,minPairX,maxPairX);
 layout.pair.y=clamp(layout.pair.y,Math.min(top+(sideTools?118:206),maxPairY),maxPairY);
 if(sideTools){
  // Leave 8 px between the pad and the leftmost tool.
  layout.pad.x=Math.min(layout.pad.x,layout.pair.x-207);
  layout.pad.y=clamp(layout.pad.y,Math.min(top+123,height-bottom-66),height-bottom-66);
 }
 return {...layout,sideTools};
}
// Store the displayed position of the group that moved. The other group may
// have been temporarily clamped by the current viewport or safe area.
export function moveHuntTouchDraft(draft,width,height,group,x,y,safe={}){
 if(group!=='pad'&&group!=='pair')throw Error('INVALID_TOUCH_GROUP');
 const orientation=height>width?'portrait':'landscape';
 const point=p=>({x:p.x/width,y:p.y/height});
 let current=draft[orientation];
 if(!current){
  const defaults=resolveHuntTouchLayout(width,height,null,safe);
  current={pad:point(defaults.pad),pair:point(defaults.pair)};
 }
 const requested={...current,[group]:{x:clamp(x/width,0,1),y:clamp(y/height,0,1)}};
 const shown=resolveHuntTouchLayout(width,height,requested,safe);
 draft[orientation]={...current,[group]:point(shown[group])};
 return shown;
}
export function mergeHuntTouchDraft(latest,draft,dirty){
 const next={...latest};
 for(const orientation of ['portrait','landscape']){
  if(dirty.has(orientation)){
   next[orientation]=draft[orientation];
   continue;
  }
  const pad=dirty.has(orientation+':pad'),pair=dirty.has(orientation+':pair');
  if(!pad&&!pair)continue;
  const edited=draft[orientation],saved=latest[orientation]??edited;
  next[orientation]={pad:pad?edited.pad:saved.pad,pair:pair?edited.pair:saved.pair};
 }
 return next;
}
export function createHuntTouchSettings({storage,clearInput=()=>{},onApply=()=>{},onOpen=()=>{},document:doc=globalThis.document,window:win=globalThis.window}){
 const store=createTouchLayoutStore(storage),probe=doc.createElement('span');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';doc.body.append(probe);const safe=()=>{const s=win.getComputedStyle(probe);return Object.fromEntries(['Top','Right','Bottom','Left'].map(k=>[k.toLowerCase(),parseFloat(s['padding'+k])||0]));};
 const panel=doc.createElement('section');panel.className='tag-touch-settings';panel.innerHTML='<h3>スマホのボタン配置</h3><p>縦・横ごとに保存。全マップ共通の配置です。</p><button type="button" data-tag-touch-edit>配置を調整</button><p data-tag-touch-note role="status"></p>';const note=panel.querySelector('[data-tag-touch-note]');note.textContent=store.problem;
 const style=doc.createElement('style');style.textContent=`.tag-touch-settings{margin-top:12px;border-top:2px solid #d7e9e7;padding:12px 0 3px}.tag-touch-settings h3{font-size:17px;margin:0}.tag-touch-settings p{font-size:13px;margin:6px 0}.tag-touch-settings button{background:#cfeee4}.tag-touch-editing #panel{visibility:hidden}.tag-touch-editing :is(#pad,#pair){visibility:hidden!important;pointer-events:none!important}.tag-touch-editor{position:fixed;inset:0;margin:0;width:100%;height:100%;max-width:none;max-height:none;border:0;padding:0;background:transparent;color:#315b6a;overflow:hidden;touch-action:none}.tag-touch-editor::backdrop{background:#d9edf333}.tag-touch-editor header,.tag-touch-editor footer{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));background:#f8fff8f2;border:2px solid white;border-radius:18px;padding:10px 12px;box-shadow:0 4px 14px #31566a30}.tag-touch-editor header{top:max(12px,env(safe-area-inset-top));pointer-events:none}.tag-touch-editor h2{font-size:20px;margin:0 0 4px}.tag-touch-editor header p{font-size:13px;margin:0}.tag-touch-editor footer{top:106px}.tag-touch-editor footer p{font-size:13px;margin:0 0 6px}.tag-touch-editor footer div{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.tag-touch-editor footer button{font-size:13px;min-height:44px;padding:6px;border-radius:14px}.tag-touch-editor [data-save]{background:#bdebd7}.tag-touch-editor [data-group]{position:absolute;padding:0;transform:translate(-50%,-50%);touch-action:none;user-select:none;cursor:grab}.tag-touch-editor [data-group]:focus-visible{outline:3px solid #c68a31;outline-offset:4px}.tag-touch-editor [data-group=pad]{width:126px;height:126px;border:3px dashed white;border-radius:50%;background:#a4dfe6d9;font-size:18px}.tag-touch-editor [data-group=pair]{width:130px;height:116px;min-height:0;border:0;background:transparent;box-shadow:none;overflow:visible}.tag-touch-editor [data-group=pair] span{position:absolute;display:grid;place-content:center;width:72px;height:72px;border:3px solid white;border-radius:50%;font-size:15px;pointer-events:none;box-shadow:0 3px 0 #729ba355}.tag-touch-editor .tt-dash{left:0;top:0;background:#ffdf99}.tag-touch-editor .tt-jump{left:54px;top:40px;background:#c9eafa}@media(orientation:landscape){.tag-touch-editor header{right:auto;width:200px;box-sizing:border-box}.tag-touch-editor h2{font-size:16px}.tag-touch-editor header p{font-size:11px}.tag-touch-editor footer{top:max(12px,env(safe-area-inset-top));left:224px}.tag-touch-editor footer p{font-size:12px}.tag-touch-editor footer button{font-size:12px}}`;doc.head.append(style);
 let editor=null,draft=null,drag=null,priorFocus=null;const dirty=new Set(),orientation=()=>win.innerHeight>win.innerWidth?'portrait':'landscape';
 function refresh(){try{store.refresh(storage?.getItem(TOUCH_LAYOUT_KEY)??null);}catch{}}
 function geometry(prefs=store.value){return resolveHuntTouchLayout(win.innerWidth,win.innerHeight,prefs[orientation()],safe());}
 function endDrag(){const d=drag;drag=null;if(d)try{if(d.el.hasPointerCapture(d.id))d.el.releasePointerCapture(d.id);}catch{}}
 function draw(){if(!draft||!editor?.open)return;const l=geometry(draft);editor.dataset.orientation=l.orientation;editor.querySelector('[data-orientation]').textContent=l.orientation==='portrait'?'縦画面':'横画面';for(const group of['pad','pair']){const el=editor.querySelector('[data-group='+group+']');el.style.left=l[group].x+'px';el.style.top=l[group].y+'px';}}
 function apply(){
  if(!draft)refresh();
  const layout=geometry();
  doc.body.classList.toggle('tag-side-tools',layout.sideTools);
  onApply(layout);
  if(editor?.open){endDrag();draw();}
  return layout;
 }
 function close(){endDrag();draft=null;if(editor?.open)editor.close();doc.body.classList.remove('tag-touch-editing');clearInput();apply();if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});priorFocus=null;}
 function move(group,x,y){moveHuntTouchDraft(draft,win.innerWidth,win.innerHeight,group,x,y,safe());dirty.add(orientation()+':'+group);draw();}
 function makeEditor(){if(editor)return;editor=doc.createElement('dialog');editor.className='tag-touch-editor';editor.setAttribute('aria-label','鬼ごっこのボタン配置を調整');editor.innerHTML='<header><h2>ボタンの位置 <small data-orientation></small></h2><p>丸い枠を動かして調整</p></header><button type="button" data-group="pad" aria-label="左パッドを移動">パッド</button><button type="button" data-group="pair" aria-label="ダッシュ・ジャンプを移動"><span class="tt-dash">ダッシュ</span><span class="tt-jump">ジャンプ</span></button><footer><p data-status role="status">保存で決定。画面を回すと横も調整できます。</p><div><button type="button" data-default>初期位置</button><button type="button" data-cancel>やめる</button><button type="button" data-save>保存</button></div></footer>';doc.body.append(editor);
  for(const el of editor.querySelectorAll('[data-group]')){el.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;e.preventDefault();const l=geometry(draft),group=el.dataset.group;drag={el,id:e.pointerId,group,x:e.clientX-l[group].x,y:e.clientY-l[group].y};try{el.setPointerCapture(e.pointerId);}catch{endDrag();}});el.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();move(drag.group,e.clientX-drag.x,e.clientY-drag.y);});for(const type of['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>{if(drag?.id===e.pointerId)endDrag();});el.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const p=geometry(draft)[el.dataset.group];move(el.dataset.group,p.x+(e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0),p.y+(e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0));});}
  editor.querySelector('[data-cancel]').onclick=close;editor.addEventListener('cancel',e=>{e.preventDefault();close();});editor.addEventListener('close',()=>{if(draft)close();});editor.querySelector('[data-default]').onclick=()=>{draft[orientation()]=null;dirty.add(orientation());draw();editor.querySelector('[data-status]').textContent='この向きを初期位置に戻しました。保存で決定。';};editor.querySelector('[data-save]').onclick=()=>{refresh();const error=store.save(mergeHuntTouchDraft(store.value,draft,dirty));if(error){editor.querySelector('[data-status]').textContent=error;return;}note.textContent='配置を保存しました。';close();};
 }
 panel.querySelector('[data-tag-touch-edit]').onclick=()=>{onOpen();clearInput();refresh();draft=store.value;dirty.clear();priorFocus=doc.activeElement;makeEditor();editor.querySelector('[data-status]').textContent='保存で決定。画面を回すと横も調整できます。';doc.body.classList.add('tag-touch-editing');editor.showModal();draw();editor.querySelector('[data-group=pad]').focus({preventScroll:true});};
 win.addEventListener('blur',endDrag);doc.addEventListener('visibilitychange',endDrag);win.addEventListener('pagehide',endDrag);apply();return{panel,apply,close,get open(){return!!editor?.open;}};
}
