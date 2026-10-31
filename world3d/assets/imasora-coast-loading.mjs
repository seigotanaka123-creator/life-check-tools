import {coastWorkMoorPlan,coastWorkMoored,coastLoadingOffer,coastLoadingPlan,coastLooseParts,coastReadout,rotate} from './imasora-coast-physics.mjs?v=120nz';
import {createCoastAlignmentControl} from './imasora-coast-align-control.mjs?v=120od';

// Field tools operate the ordinary editor. Neither the preview nor this HUD
// creates a box, changes its pose, or invents inventory/rewards.
export function createCoastLoadingHUD({dock,getPlay,getContext,edit,onFloat,prepare,note,finishAlignment=()=>{}}){
 const row=document.createElement('section');row.className='sea-loading';row.hidden=true;row.setAttribute('aria-label','箱を船へ積む');row.innerHTML='<strong>📦 箱を船へ</strong><p data-loading-note role="status"></p><div data-loading-choices hidden><button type="button" data-loading-side="0">船の前</button><button type="button" data-loading-side="1">船の後ろ</button></div><div class="sea-loading-actions"><button type="button" data-loading-main></button><button type="button" data-loading-cancel hidden>やめる</button></div>';
 dock.querySelector('.sea-direct-bar').before(row);const q=s=>row.querySelector(s),put=(e,t)=>{if(e.textContent!==t)e.textContent=t;};let choice=null,disposed=false,preview=null;
 const current=()=>{const context=getContext(),s=getPlay(),offer=coastLoadingOffer(s,context.board);return {context,s,offer};};
 const alignment=createCoastAlignmentControl({row,getPlay,getContext,edit,prepare,finish:finishAlignment});
 function cancel(){alignment.cancel();choice=null;preview=null;dock.classList.remove('is-loading-preview');}
 function plan(){const {context,s,offer}=current();if(!choice||!offer||offer.board!==choice.board||s.edit!==choice.edit){cancel();return null;}return coastLoadingPlan(s,choice.board,choice.side,{...context,source:choice.source});}
 function update(){if(disposed)return;const {context,s,offer}=current();if(!context.allowed){cancel();row.hidden=true;dock.classList.remove('has-loading');return;}if(choice)preview=plan();row.hidden=!offer;dock.classList.toggle('has-loading',!row.hidden);if(row.hidden){alignment.cancel();return;}const alignPlan=alignment.update();dock.classList.toggle('is-loading-preview',!!choice);q('[data-loading-choices]').hidden=!choice;q('[data-loading-cancel]').hidden=!choice;const main=q('[data-loading-main]');main.hidden=false;main.disabled=false;
  for(const b of row.querySelectorAll('[data-loading-side]'))b.setAttribute('aria-pressed',String(Number(b.dataset.loadingSide)===choice?.side));
  if(choice){alignment.cancel();put(q('[data-loading-note]'),preview?.message??'船のそばへ戻ろう。');put(main,'ここに渡す');main.disabled=!preview?.valid;return;}
  if(offer.secured||!offer.cargo){put(q('[data-loading-note]'),!offer.cargo?'荷物が離れたよ。空の板を片付けられるよ。':offer.ramp?'箱をしばったよ！ 板をしまって出発しよう。':'箱をしばったよ！ この船で運べるよ。');put(main,'荷役板をしまう');main.hidden=!offer.ramp;return;}main.hidden=false;
  const work=s.salvage?.cargo===offer.cargo&&s.parts.find(p=>p.id===offer.board)?.p[2]>=950&&!coastWorkMoored(s,offer.board)?coastWorkMoorPlan(s,offer.board,context):null;
  const floats=offer.cargo?coastReadout(s,offer.cargo,null,false).floats:0;
  if(work&&floats>=2&&!offer.secured&&!offer.ramp){put(main,'作業ロープを張る');main.disabled=!work.valid;put(q('[data-loading-note]'),work.message);return;}
  put(main,offer.ready?'箱をしばる':floats<2?'箱に浮きをつける':!offer.ramp?'荷役板を渡す':!offer.rigged?'滑車ロープをかける':'荷物とロープを見る');
  main.hidden=offer.rigged&&!!offer.ramp&&!offer.ready;put(q('[data-loading-note]'),offer.ready?'甲板まで届いた！ ベルトで止めよう。':floats<2?'まず箱の左右に浮きを。重い箱を水面へ持ち上げよう。':!offer.ramp?'船の前か後ろへ、板を1枚渡そう。':!offer.rigged?'板ができた！ 箱をゆっくり強く引けるロープをかけよう。':alignPlan?.message??'「まく」を長押し。甲板へ届くとベルトで止まるよ。');
 }
 q('[data-loading-cancel]').onclick=()=>{cancel();update();};for(const b of row.querySelectorAll('[data-loading-side]'))b.onclick=()=>{if(choice){choice.side=Number(b.dataset.loadingSide);update();}};
 q('[data-loading-main]').onclick=()=>{const {context,s,offer}=current();if(!context.allowed||!offer)return;if(choice){const p=plan();if(!p?.valid){note(p?.message??'もう一度、渡す場所を選ぼう。');update();return;}const action={type:'loading-ramp',id:choice.board,side:choice.side,source:choice.source};cancel();if(edit(action))note('荷役板を渡したよ。次は箱へ滑車ロープをかけよう！');update();return;}
  if(offer.secured||!offer.cargo){if(offer.ramp&&edit({type:'pack-ramp',id:offer.board}))note('荷役板を道具箱へ戻したよ。しばった箱は船に残るよ！');}
  else if(s.salvage?.cargo===offer.cargo&&s.parts.find(p=>p.id===offer.board)?.p[2]>=950&&!offer.ramp&&coastReadout(s,offer.cargo,null,false).floats>=2&&!coastWorkMoored(s,offer.board)){prepare(false);if(edit({type:'work-moor',id:offer.board}))note('船を支えたよ！ 荷役板を渡して、島からロープを巻こう。');}
  else if(offer.ready){if(edit({type:'secure',id:offer.cargo}))note('箱をしばったよ！ 荷役板をしまって運ぼう。');}
  else if(coastReadout(s,offer.cargo,null,false).floats<2)onFloat(offer.cargo);
  else if(!offer.ramp){prepare(false);const source=coastLooseParts(s,offer.board,'board').find(p=>p.id!==context.riderId)?.id??null;choice={board:offer.board,source,side:offer.side,edit:s.edit};}
  else if(!offer.rigged){prepare(false);if(edit({type:'loading-rope',board:offer.board,cargo:offer.cargo}))note('滑車ロープをかけたよ！ 「まく」を長押しして引き上げよう。');}
  else prepare(true);update();};
 return {update,cancel,sampleAlignment:()=>alignment.sample(),get aligning(){return alignment.holding;},get pending(){return !!choice;},get active(){return !row.hidden;},get preview(){return choice&&preview?.point?{part:'board',...preview,loading:true}:null;},get focus(){if(!choice||!preview?.point)return null;const {s}=current(),b=s.parts.find(p=>p.id===choice.board),p=preview.point,f=rotate(b.q,[0,0,1]);return {heading:Math.atan2(f[0],f[2])+.65,center:[(b.p[0]+p[0])/2,(b.p[1]+p[1])/2-12,(b.p[2]+p[2])/2],radius:125,label:'荷役板を渡す場所'};},dispose(){disposed=true;cancel();alignment.dispose();row.remove();dock.classList.remove('has-loading');}};
}
