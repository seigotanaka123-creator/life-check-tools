import {coastRecoveryReceiptPlan} from './imasora-coast-recovery-receipt.mjs?v=120nz';
import {coastSluiceFrame} from './imasora-coast-sluice-feedback.mjs?v=120io';

export function createCoastRecoveryReceiptHUD({dock,getPlay,getContext,getReceived,receive,showPouch,prepare,note,canvas=null}){
 const row=document.createElement('section');row.className='sea-recovery-receipt';row.hidden=true;row.setAttribute('aria-label','持ち帰った箱の建材');
 row.innerHTML='<strong data-recovery-title>📦 持ち帰った箱</strong><p data-recovery-note role="status"></p><div class="sea-recovery-actions"><button type="button" data-recovery-receive>建築セットをポーチへ</button><button type="button" data-recovery-pouch hidden>🎒 素材ポーチを見る</button><button type="button" data-recovery-look>箱を見る</button></div>';
 dock.querySelector('.sea-direct-bar').before(row);
 const q=s=>row.querySelector(s),put=(e,t)=>{if(e.textContent!==t)e.textContent=t;};let busy=false,disposed=false,failure='',requested=null,focusMode='auto',screenFrame=null,focusPoint=null;
 const portrait=()=>!!canvas&&window.innerHeight>window.innerWidth,following=()=>focusMode==='on'||focusMode==='auto'&&portrait();
 function frame(){screenFrame=following()&&portrait()?coastSluiceFrame(canvas.getBoundingClientRect(),row.parentElement.getBoundingClientRect()):null;}
 const observer=canvas&&typeof ResizeObserver!=='undefined'?new ResizeObserver(frame):null;if(observer){observer.observe(row.parentElement);observer.observe(canvas);}globalThis.window?.addEventListener('resize',frame);
 const current=()=>{const context=getContext(),s=getPlay(),plan=coastRecoveryReceiptPlan(s,context),received=plan&&getReceived()?.[plan.site];return{context,s,plan,received};};
 function update(){if(disposed)return;const {context,plan,received}=current();
  row.hidden=!context.allowed||!plan?.valid;focusPoint=row.hidden?null:plan.point;dock.classList.toggle('has-recovery-receipt',!row.hidden);if(row.hidden)return;
  put(q('[data-recovery-title]'),received?'✨ 建築セットを受け取ったよ！':'📦 持ち帰った箱');
  put(q('[data-recovery-note]'),busy?'建築セットをポーチにしまっているよ…':received?'建築セット ＋1。工房で建材にできるよ！ 箱と浮きは、また使えるよ。':failure||plan.message);
  q('[data-recovery-receive]').hidden=!!received;q('[data-recovery-receive]').disabled=busy||!plan.valid||!!context.busy;
  q('[data-recovery-pouch]').hidden=!received;q('[data-recovery-pouch]').disabled=busy||!!context.busy;
  put(q('[data-recovery-look]'),following()?'見回す':'箱を見る');q('[data-recovery-look]').setAttribute('aria-pressed',String(following()));
 }
 q('[data-recovery-receive]').onclick=async()=>{
  const {context,plan,received}=current();if(disposed||busy||received||!context.allowed||context.busy||!plan?.valid)return;
  busy=true;failure='';prepare();requested??={type:'recover',site:plan.site,cargo:plan.cargo};update();
  try{await receive(requested);requested=null;if(!disposed)note('建築セット ＋1！ 素材ポーチに入ったよ。');}
  catch(e){failure=e.message;if(!disposed)note(failure);}
  finally{busy=false;update();}
 };
 q('[data-recovery-pouch]').onclick=()=>{const {context,received}=current();if(!disposed&&!busy&&context.allowed&&!context.busy&&received)showPouch();};
 q('[data-recovery-look]').onclick=()=>{if(busy)return;focusMode=following()?'off':'on';frame();update();};
 return{update,releaseFocus(){if(focusMode!=='off'){focusMode='off';screenFrame=null;}},get focus(){return focusPoint&&following()?{center:focusPoint,radius:75,label:'持ち帰った箱',screenFrame}:null;},get busy(){return busy;},get active(){return !row.hidden;},dispose(){disposed=true;observer?.disconnect();globalThis.window?.removeEventListener('resize',frame);row.remove();dock.classList.remove('has-recovery-receipt');}};
}
