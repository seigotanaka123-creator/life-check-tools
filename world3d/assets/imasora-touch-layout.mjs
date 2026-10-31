export const TOUCH_LAYOUT_KEY='imasora-touch-layout-v1';
const clone=v=>JSON.parse(JSON.stringify(v));
const point=p=>p&&Object.getPrototypeOf(p)===Object.prototype&&Object.keys(p).length===2&&['x','y'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1);
const profile=p=>p===null||p&&Object.keys(p).length===2&&point(p.pad)&&point(p.pair);
export const defaultTouchLayouts=()=>({portrait:null,landscape:null});
export function readTouchLayouts(raw){try{if(typeof raw!=='string'||raw.length>1024)return null;const p=JSON.parse(raw);return p?.version===1&&Object.keys(p).length===3&&profile(p.portrait)&&profile(p.landscape)?{portrait:p.portrait&&clone(p.portrait),landscape:p.landscape&&clone(p.landscape)}:null;}catch{return null;}}
export function resolveTouchLayout(width,height,saved=null,safe={}){
 const portrait=height>width,left=safe.left??0,right=safe.right??0,top=safe.top??0,bottom=safe.bottom??0;
 const clamp=(v,a,b)=>Math.min(Math.max(v,a),Math.max(a,b)),defaults=portrait?{pad:{x:(left+64)/width,y:.68},pair:{x:(width-right-63)/width,y:.68}}:{pad:{x:(left+79)/width,y:(height-bottom-87)/height},pair:{x:(width-right-63)/width,y:(height-bottom-43)/height}};
 const p=saved??defaults,minY=Math.max(top+95,portrait?Math.max(top+300,height*.43):Math.min(height*.5,160));
 const pad={x:clamp(p.pad.x*width,left+64,width/2-62),y:clamp(p.pad.y*height,minY,height-bottom-66)},pair={x:clamp(p.pair.x*width,width/2+60,width-right-63),y:clamp(p.pair.y*height,minY,height-bottom-43)};
 const controlBottom=Math.max(pad.y+59,pair.y+35),controlTop=Math.min(pad.y-59,pair.y-35),below=height-bottom-controlBottom-24,deckBelow=below>=130;
 const deck={bottom:deckBelow?bottom+12:height-controlTop+12,height:Math.min(height*.38,Math.max(80,deckBelow?below:controlTop-top-212))};
 return{orientation:portrait?'portrait':'landscape',pad,pair,right:width-pair.x-55,bottom:height-pair.y-35,deck};
}
export function createTouchLayoutStore(storage){
 let value=defaultTouchLayouts(),problem='';try{const raw=storage?.getItem(TOUCH_LAYOUT_KEY);if(raw){value=readTouchLayouts(raw)??defaultTouchLayouts();if(!readTouchLayouts(raw))problem='保存した配置を読み取れなかったため、初期配置を使っています。';}}catch{problem='この端末では配置を読み取れません。';}
 return{get value(){return clone(value);},get problem(){return problem;},save(next){const raw=JSON.stringify({version:1,...next}),checked=readTouchLayouts(raw);if(!checked)return'配置をたしかめてください。';try{if(!storage)throw Error();storage.setItem(TOUCH_LAYOUT_KEY,raw);}catch{return'保存できませんでした。配置は変更していません。';}value=checked;problem='';return'';},refresh(raw){const next=raw===null?defaultTouchLayouts():readTouchLayouts(raw);if(!next)return false;value=next;return true;}};
}
export function createTouchLayoutSettings({clearInput=()=>{},windowTarget=window,documentTarget=document,storage}={}){
 const doc=documentTarget,win=windowTarget;try{storage??=win.localStorage;}catch{}const store=createTouchLayoutStore(storage),root=doc.documentElement;
 const probe=doc.createElement('span');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';doc.body.append(probe);
 const safe=()=>{const s=win.getComputedStyle(probe);return Object.fromEntries(['Top','Right','Bottom','Left'].map(k=>[k.toLowerCase(),parseFloat(s['padding'+k])||0]));};
 const size=()=>{const r=doc.querySelector('#viewport')?.getBoundingClientRect();return{width:r?.width||win.innerWidth,height:r?.height||win.innerHeight,left:r?.left||0,top:r?.top||0};};
 const dirtyOrientations=new Set();let editor=null,draft=null,drag=null,selected='pad',layout=null,lastOrientation=null,disposed=false,priorFocus=null;
 const geometry=(prefs=store.value)=>{const{width,height}=size(),orientation=height>width?'portrait':'landscape';return resolveTouchLayout(width,height,prefs[orientation],safe());};
 const release=()=>{globalThis.IMASORA_KEYS?.release();clearInput();};
 function apply(){const s=size(),orientation=s.height>s.width?'portrait':'landscape';root.dataset.touchLayout=orientation==='portrait'||store.value[orientation]?orientation:'';const l=geometry();root.style.setProperty('--touch-pad-x',l.pad.x+'px');root.style.setProperty('--touch-pad-y',l.pad.y+'px');root.style.setProperty('--touch-pair-right',l.right+'px');root.style.setProperty('--touch-pair-bottom',l.bottom+'px');root.style.setProperty('--touch-deck-bottom',l.deck.bottom+'px');root.style.setProperty('--touch-deck-height',l.deck.height+'px');}
 const panel=doc.createElement('section');panel.className='touch-layout-settings';panel.innerHTML='<div><span aria-hidden="true">🎮</span><div><h3>スマホのボタン配置</h3><p>握りやすい位置に動かせるよ。</p></div></div><button type="button" data-touch-edit>ボタンの位置を変える</button><p data-touch-layout-note role="status"></p>';
 const note=panel.querySelector('[data-touch-layout-note]');note.textContent=store.problem||'縦・横の配置を別々に覚えるよ。';
 const endDrag=()=>{if(!drag)return;const d=drag;drag=null;try{if(d.el.hasPointerCapture(d.id))d.el.releasePointerCapture(d.id);}catch{};};
 function close(){endDrag();draft=null;if(editor?.open)editor.close();doc.body.classList.remove('touch-layout-editing');release();apply();if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});priorFocus=null;}
 function draw(){if(!draft||!editor?.open)return;layout=geometry(draft);const offset=size();lastOrientation=layout.orientation;editor.dataset.orientation=layout.orientation;editor.querySelector('[data-touch-orientation]').textContent=layout.orientation==='portrait'?'縦画面':'横画面';for(const group of['pad','pair']){const e=editor.querySelector('[data-touch-group="'+group+'"]');e.style.left=(layout[group].x+offset.left)+'px';e.style.top=(layout[group].y+offset.top)+'px';e.setAttribute('aria-pressed',String(selected===group));}editor.querySelector('[data-touch-selected]').textContent=selected==='pad'?'左のパッド':'ダッシュ・ジャンプ';}
 function move(group,x,y){const{width,height}=size(),orientation=height>width?'portrait':'landscape',base=geometry(draft);draft[orientation]??={pad:{x:base.pad.x/width,y:base.pad.y/height},pair:{x:base.pair.x/width,y:base.pair.y/height}};dirtyOrientations.add(orientation);draft[orientation][group]={x:Math.max(0,Math.min(1,x/width)),y:Math.max(0,Math.min(1,y/height))};draw();}
 function makeEditor(){
  editor=doc.createElement('dialog');editor.className='touch-layout-editor';editor.setAttribute('aria-label','スマホのボタン配置を調整');editor.innerHTML='<header><h2>ボタンを動かそう</h2><strong data-touch-orientation></strong><p>丸い枠をつかんで、握りやすい位置へ。</p></header><button type="button" class="touch-layout-pad" data-touch-group="pad" aria-label="左のパッドを動かす"><span aria-hidden="true">✥</span><small>パッド</small></button><button type="button" class="touch-layout-pair" data-touch-group="pair" aria-label="ダッシュとジャンプを一緒に動かす"><span class="touch-layout-dash">≫<small>ダッシュ</small></span><span class="touch-layout-jump">↟<small>ジャンプ</small></span></button><span hidden data-touch-selected></span><footer><p data-touch-editor-status role="status">画面を回すと、横の配置も調整できるよ。</p><div><button type="button" data-touch-default>この向きを初期配置へ</button><button type="button" data-touch-cancel>やめる</button><button type="button" data-touch-save>この位置で保存</button></div></footer>';
  doc.body.append(editor);
  for(const el of editor.querySelectorAll('[data-touch-group]')){
   el.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;e.preventDefault();e.stopPropagation();selected=el.dataset.touchGroup;draw();drag={id:e.pointerId,el,x:e.clientX-layout[selected].x,y:e.clientY-layout[selected].y,group:selected};try{el.setPointerCapture(e.pointerId);}catch{endDrag();}});
   el.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();move(drag.group,e.clientX-drag.x,e.clientY-drag.y);});
   for(const type of['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>{if(drag?.id===e.pointerId)endDrag();});
   el.onclick=()=>{selected=el.dataset.touchGroup;draw();};
   el.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();selected=el.dataset.touchGroup;draw();const p=layout[selected];move(selected,p.x+(e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0),p.y+(e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0));});
  }
  for(const el of editor.querySelectorAll('[data-touch-nudge]'))el.onclick=()=>{const dir=el.dataset.touchNudge,p=layout[selected];move(selected,p.x+(dir==='right'?12:dir==='left'?-12:0),p.y+(dir==='down'?12:dir==='up'?-12:0));};
  editor.querySelector('[data-touch-cancel]').onclick=close;editor.addEventListener('cancel',e=>{e.preventDefault();close();});
  editor.querySelector('[data-touch-default]').onclick=()=>{draft[layout.orientation]=null;dirtyOrientations.add(layout.orientation);draw();editor.querySelector('[data-touch-editor-status]').textContent='この向きを初期配置に戻したよ。保存で決定。';};
  editor.querySelector('[data-touch-save]').onclick=()=>{try{store.refresh(storage?.getItem(TOUCH_LAYOUT_KEY)??null);}catch{}const next=store.value;for(const orientation of dirtyOrientations)next[orientation]=draft[orientation];const error=store.save(next);if(error){editor.querySelector('[data-touch-editor-status]').textContent=error;return;}note.textContent='配置を保存したよ。';close();};
  editor.addEventListener('close',()=>{if(draft)close();});
 }
 panel.querySelector('[data-touch-edit]').onclick=()=>{if(disposed)return;release();priorFocus=doc.activeElement;draft=store.value;dirtyOrientations.clear();makeEditorOnce();doc.body.classList.add('touch-layout-editing');editor.showModal();draw();editor.querySelector('[data-touch-group="pad"]').focus({preventScroll:true});};
 function makeEditorOnce(){if(!editor)makeEditor();}
 const resize=()=>{release();endDrag();apply();if(editor?.open){draw();if(lastOrientation)editor.querySelector('[data-touch-editor-status]').textContent='縦・横それぞれの配置を調整できるよ。';}};
 const hidden=()=>{if(doc.hidden){endDrag();release();}},blur=()=>{endDrag();release();};
 const storageChanged=e=>{if(e.key!==TOUCH_LAYOUT_KEY||draft)return;if(store.refresh(e.newValue)){release();apply();}};
 const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(()=>{if(!disposed){apply();if(editor?.open)draw();}}):null;const viewport=doc.querySelector('#viewport');if(viewport)observer?.observe(viewport);
 const firstFrame=win.requestAnimationFrame?.(()=>{if(!disposed)apply();});
 win.addEventListener('resize',resize);win.visualViewport?.addEventListener('resize',resize);win.addEventListener('blur',blur);win.addEventListener('pagehide',blur);doc.addEventListener('visibilitychange',hidden);win.addEventListener('storage',storageChanged);apply();
 return{panel,get open(){return!!editor?.open;},close,dispose(){if(disposed)return;close();disposed=true;observer?.disconnect();if(firstFrame!==undefined)win.cancelAnimationFrame?.(firstFrame);win.removeEventListener('resize',resize);win.visualViewport?.removeEventListener('resize',resize);win.removeEventListener('blur',blur);win.removeEventListener('pagehide',blur);doc.removeEventListener('visibilitychange',hidden);win.removeEventListener('storage',storageChanged);panel.remove();editor?.remove();probe.remove();}};
}
