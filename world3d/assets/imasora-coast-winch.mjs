import {coastReleaseWinchBrake,coastWinchLines,COAST_WINCH,SEA_PARTS,rotate} from './imasora-coast-physics.mjs?v=120nz';
import {coastSluiceFrame} from './imasora-coast-sluice-feedback.mjs?v=120io';
import {createHeldDashButton} from './imasora-hold-dash.mjs?v=120od';

// One continuous hold owns one work undo. The next physical step only gets a
// command after the original frame has been captured by the normal editor.
export function createCoastWinchSession({begin,finish}){
 let key=null,revision=null,started=false,refused=false;
 function cancel(){const save=started;key=null;revision=null;started=false;refused=false;if(save)finish();}
 return{sample(s,intent){if(!intent){cancel();return null;}const next=[intent.board,intent.link,intent.direction].join('|');if(next!==key){cancel();key=next;}
  if(refused)return null;if(started&&s.edit!==revision){cancel();key=next;refused=true;return null;}
  const line=coastWinchLines(s,intent.board).find(j=>j.id===intent.link);if(!line||![-1,1].includes(intent.direction)||!(intent.direction<0?line.canWind:line.canPay)){cancel();key=next;refused=true;return null;}
  if(!started){if(intent.direction<0&&line.tension>=line.pull)return null;if(!begin({...intent,type:'reel'})){refused=true;return null;}started=true;revision=s.edit+1;}
  return {board:intent.board,link:intent.link,direction:intent.direction};
 },cancel,get active(){return started;}};
}

export function createCoastWinchHUD({dock,getPlay,getContext,begin,finish,canvas=null}){
 const row=document.createElement('section');row.className='sea-winch';row.hidden=true;row.setAttribute('aria-label','船のロープ巻き');row.innerHTML='<div class="sea-winch-info"><strong data-winch-load></strong><span data-winch-note role="status"></span><meter data-winch-tension min="0" max="8500" aria-label="ロープを引く重さ"></meter></div><div class="sea-winch-buttons"><button type="button" data-winch-dir="-1" aria-label="ロープを巻く（押している間）">↶ まく</button><button type="button" data-winch-dir="1" aria-label="ロープをのばす（押している間）">↷ のばす</button><button type="button" data-winch-next aria-label="別のロープを選ぶ">⇄</button></div>';
 dock.querySelector('.sea-direct-bar').before(row);let link=null,disposed=false,focused=false,focusRadius=100,screenFrame=null;
 const q=s=>row.querySelector(s),put=(e,t)=>{if(e.textContent!==t)e.textContent=t;},look=document.createElement('button');look.type='button';look.dataset.winchLook='';look.textContent='ロープを見る';q('.sea-winch-buttons').append(look);
 const session=createCoastWinchSession({begin:action=>{const ok=begin(action);if(ok)follow(true);return ok;},finish});
 const current=()=>{const context=getContext(),lines=coastWinchLines(getPlay(),context.board);return{context,lines,line:lines.find(j=>j.id===link)??lines[0]};};
 const held=[-1,1].map(direction=>{const element=q('[data-winch-dir="'+direction+'"]');return{direction,input:createHeldDashButton({element,context:()=>{const {line}=current();return line?[line.board,line.id].join('|'):'';},enabled:()=>{const {context,line}=current();return !disposed&&!row.hidden&&context.allowed&&!!line&&!(direction<0&&line.loading&&context.aboard)&&(direction<0?line.canWind:line.canPay);}})};});
 function frame(){screenFrame=focused&&canvas&&window.innerHeight>window.innerWidth?coastSluiceFrame(canvas.getBoundingClientRect(),row.parentElement.getBoundingClientRect()):null;}
 const observer=canvas&&typeof ResizeObserver!=='undefined'?new ResizeObserver(frame):null;if(observer){observer.observe(row.parentElement);observer.observe(canvas);}globalThis.window?.addEventListener('resize',frame);
 function releaseInput(){for(const h of held)h.input.cancel();session.cancel();coastReleaseWinchBrake(getPlay());}
 function cancel(){releaseInput();focused=false;screenFrame=null;dock.classList.remove('is-winch-focused');}
 function follow(value){focused=!!value;dock.classList.toggle('is-winch-focused',focused);const {line}=current();if(focused)focusRadius=Math.max(100,(line?.distance??0)/2+65);put(look,focused?'操船を見る':'ロープを見る');frame();}
 look.onclick=()=>{const next=!focused;cancel();follow(next);};
 function intent(){const {context,line}=current();if(!context.allowed||!line||row.hidden)return null;const pressed=held.filter(h=>h.input.active);return pressed.length===1?{board:line.board,link:line.id,direction:pressed[0].direction}:null;}
 q('[data-winch-next]').onclick=()=>{const {lines,line}=current();cancel();link=lines[(lines.indexOf(line)+1)%lines.length]?.id??null;update();};
 function update(){if(disposed)return;const {context,lines,line}=current();row.hidden=!context.allowed||!line;dock.classList.toggle('has-winch',!row.hidden);if(row.hidden){cancel();focused=false;return;}if(link!==line.id){cancel();focused=false;link=line.id;}
  put(q('[data-winch-load]'),(line.shore?'⚓ 岸の滑車 · ':line.loading?'🪢 滑車 · ':'➰ ')+SEA_PARTS[line.type].name+' · 長さ '+line.length.toFixed(1)+' / '+COAST_WINCH.max);
  const command=intent();put(q('[data-winch-note]'),line.loading&&context.aboard?'箱の通り道を空けよう。船を降りて、岸から巻こう。':line.arrived?'甲板へ届いたよ！ ボタンを離して、箱をしばろう。':line.slipping?'船が傾いたので安全ブレーキ。少しのばして、箱と板の向きを合わせよう。':line.tension>=line.pull?(line.shore?'止まっているよ。通り道を確かめ、ロープをゆるめてみよう':'重いよ！ 道具の浮きや位置をかえよう'):command?(command.direction<0?'巻いているよ · 離すと長さを保つ':'のばしているよ · 離すと長さを保つ'):line.tension>200?'引っぱっているよ · 離すと長さを保つ':line.slack>3?'ロープがゆるんでいるよ · まいて引こう':'長押しでまく · 離すと長さを保つ');q('[data-winch-tension]').max=line.pull;q('[data-winch-tension]').value=Math.min(line.pull,line.tension);q('[data-winch-next]').hidden=lines.length<2;put(look,focused?'操船を見る':'ロープを見る');for(const h of held)h.input.sync();
 }
 return{update,follow,releaseInput,sample(){if(current().line?.arrived){releaseInput();return null;}return session.sample(getPlay(),intent());},cancel,get holding(){return !!intent();},get target(){const {line}=current();return focused&&!row.hidden&&line?{board:line.board,load:line.load}:null;},get focus(){const {line}=current(),board=line&&getPlay().parts.find(p=>p.id===line.board),f=board&&rotate(board.q,[0,0,1]);return focused&&!row.hidden&&line?{...(line.loading&&f?{heading:Math.atan2(f[0],f[2])+.65}:{}),center:[(line.point[0]+line.target[0])/2,(line.point[1]+line.target[1])/2-(line.loading?55:20),(line.point[2]+line.target[2])/2],radius:focusRadius,label:'ロープと道具',screenFrame}:null;},dispose(){cancel();disposed=true;observer?.disconnect();globalThis.window?.removeEventListener('resize',frame);held.forEach(h=>h.input.dispose());row.remove();dock.classList.remove('has-winch');}};
}
