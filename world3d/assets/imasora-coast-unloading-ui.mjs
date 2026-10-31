import {coastUnloadingOffer,coastUnloadingPlan,coastLooseParts,rotate} from './imasora-coast-physics.mjs?v=120nz';

export function createCoastUnloadingHUD({dock,getPlay,getContext,edit,prepare,note,getNote=()=>''}){
 const row=document.createElement('section');row.className='sea-unloading';row.hidden=true;row.setAttribute('aria-label','箱を岸へ下ろす');row.innerHTML='<strong data-unload-title>📦 岸へ下ろす</strong><p data-unload-note role="status"></p><div data-unload-choices hidden><button type="button" data-unload-side="0">船の後ろ</button><button type="button" data-unload-side="1">船の前</button></div><div class="sea-unload-actions"><button type="button" data-unload-main></button><button type="button" data-unload-cancel hidden>やめる</button></div>';
 dock.querySelector('.sea-direct-bar').before(row);const q=s=>row.querySelector(s),put=(e,t)=>{if(e.textContent!==t)e.textContent=t;};let choice=null,preview=null,planKey='',working=false,disposed=false,arrivalKey='',arrivalTick=-Infinity,failure='';
 const message=t=>put(q('[data-unload-note]'),failure||t),act=a=>{failure='';const applied=edit(a);if(!applied)failure=getNote()||'箱や板の上を空けて、もう一度ためしてね。';return applied;};
 const current=()=>{const context=getContext(),s=getPlay();return{context,s,offer:coastUnloadingOffer(s,context.board)};};
 function cancel(){failure='';choice=null;preview=null;planKey='';dock.classList.remove('is-unload-preview');}
 function plan(fresh=false){const {context,s,offer}=current();if(!choice||!offer||offer.board!==choice.board||s.edit!==choice.edit){cancel();return null;}const key=[s.edit,s.tick,choice.side,choice.source,context.actor?.x,context.actor?.y,context.actor?.z].join('|');if(fresh||key!==planKey){preview=coastUnloadingPlan(s,choice.board,choice.side,{...context,source:choice.source});planKey=key;}return preview;}
 function update(){if(disposed)return;const {context,s,offer}=current();if(!context.allowed){cancel();row.hidden=true;dock.classList.remove('has-unloading','is-unloading');return;}if(choice)plan();row.hidden=!offer;dock.classList.toggle('has-unloading',!row.hidden);working=!!offer&&(!!choice||!!offer.ramp||!!offer.line);dock.classList.toggle('is-unloading',working);dock.classList.toggle('is-unload-preview',!!choice);if(row.hidden)return;
  const key=s.edit+':'+offer.line;if(offer.line&&offer.landed){arrivalKey=key;arrivalTick=s.tick;}const arrived=offer.landed||!!offer.line&&arrivalKey===key&&s.tick-arrivalTick<=120;
  const main=q('[data-unload-main]');main.hidden=false;main.disabled=false;q('[data-unload-choices]').hidden=!choice;q('[data-unload-cancel]').hidden=!choice;put(q('[data-unload-title]'),arrived?'✨ 岸へ下ろせた！':'📦 岸へ下ろす');for(const b of row.querySelectorAll('[data-unload-side]'))b.setAttribute('aria-pressed',String(Number(b.dataset.unloadSide)===choice?.side));
  if(choice){message(preview?.message??'渡す場所を選び直そう。');put(main,'ここに渡す');main.disabled=!preview?.valid;return;}
  if(!offer.cargo){put(main,'荷下ろし板をしまう');message('箱は岸に残るよ。空の板を片付けよう。');}
  else if(offer.line){main.hidden=!arrived;main.disabled=!offer.landed;put(main,'ロープを片付ける');message(offer.landed?'箱が岸へ届いたよ。船のロープを片付けよう。':arrived?'箱が落ち着くまで、少し待とう。':'「まく」を長押し。離すと、2本のロープで支えるよ。');}
  else if(!offer.ramp){put(main,'荷下ろし板を渡す');message('運んできた箱を、桟橋へ下ろせるよ。船を停めて板でつなごう。');}
  else if(offer.floats){put(main,'箱の浮きを1こはずす');main.disabled=!offer.floatLink;message('箱に浮きが'+offer.floats+'こ。浮きは海に残し、箱だけを下ろそう。');}
  else{put(main,'ベルトをほどいて下ろす');message('岸のロープと船のブレーキロープで支えるよ。岸の横へよけてから押そう。');}
 }
 q('[data-unload-cancel]').onclick=()=>{cancel();update();};for(const b of row.querySelectorAll('[data-unload-side]'))b.onclick=()=>{if(choice){choice.side=Number(b.dataset.unloadSide);planKey='';update();}};
 q('[data-unload-main]').onclick=()=>{failure='';const {context,s,offer}=current();if(!context.allowed||!offer)return;if(choice){const p=plan(true);if(!p?.valid){note(p?.message??'場所を選び直そう。');update();return;}const action={type:'unload-ramp',board:choice.board,side:choice.side,source:choice.source};cancel();if(act(action))note('船と岸を板でつないだよ！ 次は箱を下ろそう。');update();return;}
  if(!offer.cargo){if(act({type:'pack-ramp',id:offer.board}))note('板をしまったよ。下ろした箱は、岸のその場所に残るよ！');}
  else if(offer.line){if(offer.landed&&edit({type:'unload-release',board:offer.board}))note('ロープを片付けたよ。あとは板をしまおう。');}
  else if(!offer.ramp){prepare(false);const source=coastLooseParts(s,offer.board,'board').find(p=>p.id!==context.riderId)?.id??null;const rear=coastUnloadingPlan(s,offer.board,0,{...context,source}),front=rear.valid?null:coastUnloadingPlan(s,offer.board,1,{...context,source});choice={board:offer.board,source,side:front?.valid?1:0,edit:s.edit};}
  else if(offer.floats){if(act({type:'unload-float',board:offer.board,link:offer.floatLink}))note('浮きを1こはずしたよ。浮きは海岸に残るよ。');}
  else{prepare(false);if(act({type:'unload',board:offer.board})){note('2本のロープでつないだよ。「まく」を長押しして、岸へ下ろそう！');prepare(true);}}update();};
 return{update,cancel,get working(){return working;},get active(){return !row.hidden;},get pending(){return !!choice;},get preview(){return choice&&preview?.point?{part:'board',...preview,loading:true}:null;},get focus(){if(!choice||!preview?.point)return null;const {s}=current(),b=s.parts.find(p=>p.id===choice.board),f=rotate(b.q,[0,0,1]),p=preview.point;return{heading:Math.atan2(f[0],f[2])+.65,center:[(b.p[0]+p[0])/2,(b.p[1]+p[1])/2-15,(b.p[2]+p[2])/2],radius:115,label:'船から岸へ渡す場所'};},dispose(){disposed=true;cancel();row.remove();dock.classList.remove('has-unloading','is-unloading');}};
}
